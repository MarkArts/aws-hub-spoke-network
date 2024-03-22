let
    syspkgs = import <nixpkgs> { };
    channel = syspkgs.fetchFromGitHub {
        owner = "NixOS";
        repo = "nixpkgs";

        # Nix uses the sha256 to determine the cached value and this file will not update unless
        # `sha256` is changes too. You can change a random string, run nix-shell env.nix and get the new
        # sha256
        rev = "431fd13c27fadce4c687d047bc9ed3e65e3446cd";  # pulumi v3.109.0
        sha256 = "sha256-5tdWIKPOBI52+eJIyoFkaF10JEgrsrxdvNlXjIv8jQ4=";
    };
in
with (import channel) {};

stdenv.mkDerivation {
    name = "couchdb-deployment-env";

    buildInputs = with channel; [
        # pulumi
        pulumi
        pulumiPackages.pulumi-language-nodejs

        nodejs
        nodePackages.prettier

        # AWS
        awscli2
        
        figlet
        lolcat
    ];

    shellHook = ''
        figlet "AWS HUB SPOKE NETWORK" | lolcat --freq 0.5
        npm install

        echo "
            Make sure you have set an appropriate AWS_PROFILE
        "
    '';
}
